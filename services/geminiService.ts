
import OpenAI from "openai";
import { GeminiResponse } from "../types";


const SYSTEM_INSTRUCTION = `你是一个高速OCR助手，专门识别物流标签上的编码。
规则：
1. 忽略所有二维码、条形码图形、扫码文字。
2. 仅提取：SN(序列号)。
3. 忽略 SKU、MAC、日期等其他信息。
4. 如果图中找不到SN，返回 null。
5. 严禁输出任何解释性文字。
6. 必须返回有效的JSON格式，包含以下字段：sn, other_codes, confidence。`;

export const recognizeLabel = async (base64Image: string): Promise<GeminiResponse> => {
  if (!base64Image || base64Image.length < 100) {
    throw new Error("图像无效");
  }

  // 火山引擎豆包 API 配置
  const apiKey = process.env.ARK_API_KEY || process.env.API_KEY;
  const apiBase = process.env.ARK_API_BASE || "https://ark.cn-beijing.volces.com/api/v3";
  const modelName = process.env.ARK_MODEL || "Doubao-Seed-1.6-flash";

  if (!apiKey) {
    throw new Error("未配置 ARK_API_KEY 环境变量");
  }

  // 初始化 OpenAI 兼容客户端（火山引擎豆包使用 OpenAI 兼容接口）
  const client = new OpenAI({
    baseURL: apiBase,
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  try {
    // 构建图片 base64 URL
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    // 调用豆包 API
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: SYSTEM_INSTRUCTION
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            },
            {
              type: "text",
              text: "仅提取SN（序列号）。严禁提取SKU、MAC、P/N等其他编码。返回JSON：{\"sn\": \"序列号或null\", \"other_codes\": [], \"confidence\": 0.9}。"
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("识别无结果");
    }

    // 解析 JSON 响应
    let result: GeminiResponse;
    try {
      result = JSON.parse(content.trim()) as GeminiResponse;
    } catch (parseError) {
      // 如果直接解析失败，尝试从文本中提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]) as GeminiResponse;
      } else {
        throw new Error("无法解析识别结果");
      }
    }

    // 确保返回的数据结构完整
    // 强制过滤 SKU 和 MAC，即使 AI 返回了它们
    const filteredOtherCodes = (result.other_codes ?? []).filter(code => {
      const label = code.label.toUpperCase();
      return !label.includes('SKU') && !label.includes('MAC') && !label.includes('P/N') && !label.includes('MODEL');
    });

    return {
      sn: result.sn ?? null,
      sku: null, // Force null
      mac: null, // Force null
      other_codes: filteredOtherCodes,
      confidence: result.confidence ?? 0.8
    };
  } catch (error: any) {
    console.error("豆包 API Error:", error);
    if (error?.message?.includes("400") || error?.message?.includes("INVALID_ARGUMENT")) {
      throw new Error("图像无法解析，请确保光线充足且已对焦");
    }
    if (error?.message?.includes("429") || error?.message?.includes("rate limit")) {
      throw new Error("请求过于频繁，请稍后再试");
    }
    if (error?.message?.includes("timeout") || error?.message?.includes("deadline")) {
      throw new Error("识别超时，请检查网络");
    }
    throw new Error(error?.message || "识别服务繁忙，请稍后再试");
  }
};
