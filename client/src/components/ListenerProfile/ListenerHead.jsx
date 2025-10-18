import React from "react";

export default function ListenerHead({ listener }){
    if (!listener) return null;

    return (
        <div className="w-full mb-8 flex flex-col items-start md:flex-row md:items-center gap-6">
            {/* Profile Picture */}
            <img
                src={listener.PFP || "/default-pfp.jpg"}
                alt="Profile"
                className="w-32 h-32 rounded-full border-4 border-gray-200 shadow-md object-cover"
            />

            {/* Info */}
            <div className="flex flex-col">
                <h1 className="text-3xl font-semibold">
                    {listener.FirstName} {listener.LastName}
                </h1>
                <p className="text-gray-600 mt-1">{listener.Bio || "No bio yet."}</p>
            </div>
        </div>
    );
}
