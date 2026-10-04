"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueEmail = generateUniqueEmail;
exports.generateValidPassword = generateValidPassword;
exports.generateValidPhone = generateValidPhone;
exports.generateValidCpf = generateValidCpf;
exports.generateValidCnpj = generateValidCnpj;
exports.buildAuthCookie = buildAuthCookie;
function generateUniqueEmail(prefix = 'e2eS04') {
    return `${prefix}+${Date.now()}+${Math.floor(Math.random() * 10000)}@example.com`;
}
function generateValidPassword() {
    return 'SenhaE2e123';
}
function generateValidPhone() {
    return '11987654321';
}
function generateValidCpf() {
    return '52998224725';
}
function generateValidCnpj() {
    return '11444777000161';
}
function buildAuthCookie(sessionId) {
    return `session_id=${sessionId}`;
}
//# sourceMappingURL=test-helpers.js.map