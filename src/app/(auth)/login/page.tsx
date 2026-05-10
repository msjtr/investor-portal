import styles from "./Login.module.scss";

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>تسجيل الدخول</h1>

        <input type="email" placeholder="البريد الإلكتروني" />
        <input type="password" placeholder="كلمة المرور" />

        <button>دخول</button>
      </div>
    </div>
  );
}
