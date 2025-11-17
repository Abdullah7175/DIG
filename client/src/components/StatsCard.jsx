import { ArrowUp } from "lucide-react";

export default function StatsCard({ title, value, icon: Icon, trend, color = "primary", description }) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    warning: "bg-warning/10 text-warning",
    approved: "bg-approved/10 text-approved",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="text-xl" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span className="text-sm text-secondary">
            <ArrowUp className="text-xs mr-1 inline" />
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}
