declare namespace SessionNext {
  interface Session {
    user: User
    expires?: string
    token?: string
    refreshToken?: string
  }

  interface Client {
    id: number
    name: string
    email: string
    avatar: string | null
    role: "investidor" | "fundador" | "admin" | "consultor" | "afiliado"
  }
}
    
type User = {
  id: number
  name: string
  email: string
  avatar: string | null
  role: "investidor" | "fundador" | "admin" | "consultor" | "afiliado"
}