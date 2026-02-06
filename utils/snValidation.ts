export const SN_PREFIX = "952985";
export const SN_LEN = 20;

const RARE_2ND_LAST_LETTERS = new Set("klmnopqrstuvwxyzKLMNOPQRSTUVWXYZ");

export interface ValidationResult {
    isValid: boolean;
    messages: string[];
}

export const validateSN = (sn: string | null): ValidationResult => {
    const messages: string[] = [];
    if (!sn) {
        return { isValid: false, messages: ["SN为空"] };
    }

    const s = sn.trim();

    // 1. Length Check
    if (s.length !== SN_LEN) {
        messages.push(`长度错误(当前${s.length}位, 应20位)`);
    }

    // 2. Prefix Check
    if (!s.startsWith(SN_PREFIX)) {
        messages.push(`前缀错误(当前${s.slice(0, 6)}, 应${SN_PREFIX})`);
    }

    // Only proceed to detailed checks if length allows, or just check indices safely
    // We'll check specific positions if the string is long enough to have them

    // 3. Positional Checks
    // 第7位：字母 (Index 6)
    if (s.length > 6 && !/[a-zA-Z]/.test(s[6])) {
        messages.push("第7位应为字母");
    }

    // 第8位：数字 (Index 7)
    if (s.length > 7 && !/\d/.test(s[7])) {
        messages.push("第8位应为数字");
    }

    // 第9位：字母 (Index 8)
    if (s.length > 8 && !/[a-zA-Z]/.test(s[8])) {
        messages.push("第9位应为字母");
    }

    // 第10-18位：9位数字 (Index 9-17)
    let digitsError = false;
    for (let i = 9; i < 18; i++) {
        if (s.length > i && !/\d/.test(s[i])) {
            digitsError = true;
            break;
        }
    }
    if (digitsError) {
        messages.push("第10-18位应为数字");
    }

    // 第19-20位：数字或字母 (Index 18-19)
    let suffixError = false;
    for (let i = 18; i < 20; i++) {
        if (s.length > i && !/[a-zA-Z0-9]/.test(s[i])) {
            suffixError = true;
            break;
        }
    }
    if (suffixError) {
        messages.push("最后2位应为数字或字母");
    }

    // 4. Special Warning (Rare letters)
    // Index 18 is the 19th character (2nd to last)
    if (s.length >= 19 && RARE_2ND_LAST_LETTERS.has(s[18])) {
        messages.push("提示:倒数第2位为少见字母");
    }

    return {
        isValid: messages.length === 0,
        messages
    };
};
