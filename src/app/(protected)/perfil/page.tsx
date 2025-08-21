
const request = async () => {
  const response = await fetch('/api/perfil');
  const data = await response.json();
  return data;
}


export default async function Perfil() {
  const data = await request();
  console.log("🚀 ~ Perfil ~ data:", data)

  return (
    <div>
      <h1>Perfil</h1>
    </div>
  );
}