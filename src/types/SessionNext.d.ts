declare namespace SessionNext {
  interface Session {
    user: User
    expires?: string
    token?: string
    refreshToken?: string
  }

  interface Client extends User {}
}
    
interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role: "investidor" | "fundador" | "admin" | "afiliado"
}