import type { Route } from "./+types";


export async function loader({ params }: Route.LoaderArgs) {
  const  data = params.id;
  return  {data};
}

export default function Startup ({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Startup {loaderData?.data}</h1>
    </div>
  );
}
