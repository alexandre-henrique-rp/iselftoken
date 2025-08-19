declare namespace SessionNext {
  interface Session {
    user: User
    expires?: string
    token?: string
    refreshToken?: string
  }
}
    
interface User {
  id: number
  name: string
  email: string
  role: "investidor" | "startup" | "admin" | "afiliado"
}