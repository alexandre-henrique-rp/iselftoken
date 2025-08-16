interface StartupHomeProps {
    data: {
        name: string
    }
}

export default function StartupHome({ data }: StartupHomeProps) {
    return (
        <div>
            <h1>Startup Home</h1>
            <p>{data.name}</p>
        </div>
    )
}