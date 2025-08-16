interface InvestorHomeProps {
    data: {
        name: string
    }
}
export default function InvestorHome({ data }: InvestorHomeProps) {
    return (
        <div>
            <h1>Investidor Home</h1>
            <p>{data.name}</p>
        </div>
    )
}