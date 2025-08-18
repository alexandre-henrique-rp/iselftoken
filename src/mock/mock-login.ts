import * as jose from 'jose';

type Role = 'startup' | 'investidor' | 'admin' | 'afiliado'
interface Usuario {
  id: number
  name: string
  email: string
  role: Role
  password: string
}

const DadosLogin: Usuario[] = [
  {
    id: 1,
    name: 'Startup teste',
    email: 'startup@teste.com',
    role: 'startup',
    password: '123456',
  },
  {
    id: 2,
    name: 'Investidor teste',
    email: 'investidor@teste.com',
    role: 'investidor',
    password: '123456',
  },
  {
    id: 3,
    name: 'Admin teste',
    email: 'admin@teste.com',
    role: 'admin',
    password: '123456',
  },
  {
    id: 4,
    name: 'Afiliado teste',
    email: 'afiliado@teste.com',
    role: 'afiliado',
    password: '123456',
  }
];

export async function mockLogin({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const usuario = DadosLogin.find(
      (usuario) => usuario.email === email && usuario.password === password,
    );
  
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
  
    // generate token com jose
    const payload: SessionNext.Session['user'] = {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
    };
  
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
  
    const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(secret)
  
    const refresh_token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(secret)
  
    return {
      status: "success",
      message: "Login efetuado com sucesso",
      data: {
        user: payload,
        token: token,
        refresh_token: refresh_token
      }
    }
  } catch (error) {
    console.log(error)
    return {
      status: "error",
      message: "Erro ao efetuar login",
    }
  }
}
