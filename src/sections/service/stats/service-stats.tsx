import React from "react";
import { Pie, Cell, Tooltip, PieChart } from "recharts";

import { Box, Typography } from "@mui/material";

interface Service {
    total_views: number;
    comments?: string[] | { items?: any[]; total?: number }; // Support both old array format and new object format
    total_reviews: number;
    category?: string[];
}

interface ServiceStatsProps {
    services?: Service[];
    totalCount?: number; // Total count from API meta
}

// Helper function to safely get comment count from service
const getCommentCount = (service: Service): number => {
    if (!service.comments) return 0;
    
    // New format: object with items array or total
    if (typeof service.comments === 'object' && !Array.isArray(service.comments)) {
        return service.comments.total ?? service.comments.items?.length ?? 0;
    }
    
    // Old format: array
    if (Array.isArray(service.comments)) {
        return service.comments.length;
    }
    
    return 0;
};

const ServiceStats: React.FC<ServiceStatsProps> = ({ services, totalCount }) => {
    // Aggregate stats
    const totalViews = services?.reduce((acc, service) => acc + (service.total_views || 0), 0) ?? 0;
    const totalComments = services?.reduce((acc, service) => acc + getCommentCount(service), 0) ?? 0;
    const totalReviews = services?.reduce((acc, service) => acc + (service.total_reviews || 0), 0) ?? 0;
    // Use totalCount from API meta if provided, otherwise fall back to services array length
    const totalServices = totalCount !== undefined ? totalCount : (services?.length ?? 0);


    const chartData = [
        { name: 'Total Views', value: totalViews, color: '#FF9B33' },
        { name: 'Total Comments', value: totalComments, color: '#83D475' },
        { name: 'Total Reviews', value: totalReviews, color: '#FFE381' },
    ];

    // Generate chart data based on categories
    // const categoryCounts: Record<string, number> = {};
    // services?.forEach(service => {
    //     service?.category.forEach(cat => {
    //         if (service.category) {
    //             service.category.forEach(cat => {
    //                 categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    //             });
    //         } // Ensure category is defined

    //     });
    // });



    // const chartData = Object.keys(categoryCounts).map(cat => ({
    //     name: cat,
    //     value: categoryCounts[cat],
    //     color: `#${Math.floor(Math.random() * 16777215).toString(16)}` // Random colors
    // }));

    return (
        <Box>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {totalServices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Total Service
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <PieChart width={200} height={200}>
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        innerRadius={50}
                        fill="#8884d8"
                        labelLine={false}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={entry.name} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 4 }}>
                <Typography variant="body2">
                    <Box component="span" sx={{ color: "#FF9B33", fontWeight: "bold", mr: 1 }}>●</Box>
                    Total Views <Box component="span" sx={{ float: "right" }}>{totalViews}</Box>
                </Typography>
                <Typography variant="body2">
                    <Box component="span" sx={{ color: "#83D475", fontWeight: "bold", mr: 1 }}>●</Box>
                    Total Comments <Box component="span" sx={{ float: "right" }}>{totalComments}</Box>
                </Typography>
                <Typography variant="body2">
                    <Box component="span" sx={{ color: "#FFE381", fontWeight: "bold", mr: 1 }}>●</Box>
                    Total Reviews <Box component="span" sx={{ float: "right" }}>{totalReviews}</Box>
                </Typography>
            </Box>
        </Box>
    );
};

export default ServiceStats;
