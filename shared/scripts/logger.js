import { db } from '../../js/database.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

/**
 * محرك السجلات الأمنية (Security Audit Logger) - منصة تيرا
 * يقوم بتوثيق كافة العمليات (دخول، تسجيل، استعادة، أخطاء)
 */
export async function logSecurityEvent(email, actionType, status, securityData, extraDetails = "") {
    try {
        await addDoc(collection(db, "security_logs"), {
            email: email.toLowerCase(),
            actionType: actionType, // login, register, reset_password, failed_attempt
            status: status,         // success, warning, failed
            ip: securityData.ip || "Unknown",
            location: securityData.location || "Unknown",
            device: navigator.userAgent,
            details: extraDetails,
            timestamp: new Date().toISOString()
        });
        console.log(`[Audit Trail] Logged ${actionType} for ${email}`);
    } catch (error) {
        console.error("🚨 [Security Logger Error]: Failed to save audit log", error);
    }
}
