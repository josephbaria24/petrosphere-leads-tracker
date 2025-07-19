import { Component } from "./chart"

export default function LineChart() {
    return (
        <div className="grid-cols-4 place-items-center min-h-screen">
            <h1 className="text-2xl font-bold mt-4">Line Chart</h1>
            <Component />
        </div>
    )
}