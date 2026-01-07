import React from "react";
import { Pie, Cell, Tooltip, PieChart } from "recharts";

import { Box, Typography } from "@mui/material";

interface Service {
    total_views: number;
    comments?: string[] | { items?: any[]; total?: number }; // Support both old array format and new object format
    total_reviews: number;
    category?: string[];
}

interface Category {
    id: string;
    name: string;
}

interface ServiceStatsProps {
    services?: Service[];
    totalCount?: number; // Total count from API meta
    categories?: Category[]; // Categories to map IDs to names
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

const ServiceStats: React.FC<ServiceStatsProps> = ({ services, totalCount, categories = [] }) => {
    // Aggregate stats - ALL DATA COMES FROM API, NO HARDCODED VALUES
    // total_views, total_reviews, and comments are fetched from /api/services endpoint
    // Each service's totalReviews is calculated from actual Review records in the database
    // The || 0 fallback is only for defensive programming when API field is missing
    const totalViews = services?.reduce((acc, service) => acc + (service.total_views || 0), 0) ?? 0;
    const totalComments = services?.reduce((acc, service) => acc + getCommentCount(service), 0) ?? 0;
    const totalReviews = services?.reduce((acc, service) => acc + (service.total_reviews || 0), 0) ?? 0;
    // Use totalCount from API meta if provided, otherwise fall back to services array length
    const totalServices = totalCount !== undefined ? totalCount : (services?.length ?? 0);

    // Helper function to get category name from ID
    const getCategoryName = (categoryId: string): string => {
        const category = categories.find(cat => cat.id === categoryId);
        return category?.name || categoryId; // Fallback to ID if name not found
    };

    // Generate chart data based on categories
    const categoryCounts: Record<string, number> = {};
    services?.forEach(service => {
        if (service.category) {
            service.category.forEach(catId => {
                const categoryName = getCategoryName(catId);
                categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
            });
        }
    });

    // Convert category counts to chart data
    const categoryChartData = Object.entries(categoryCounts).map(([category, count], index) => {
        // Generate different colors for each category
        const colors = ['#FF9B33', '#83D475', '#FFE381', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        return {
            name: category,
            value: count,
            color: colors[index % colors.length]
        };
    });

    // Sort by count (descending) and limit to top 8 categories for better visualization
    const sortedCategoryData = categoryChartData
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

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
                        data={sortedCategoryData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        innerRadius={50}
                        fill="#8884d8"
                        labelLine={false}
                    >
                        {sortedCategoryData.map((entry, index) => (
                            <Cell key={entry.name} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value, name) => [`${value} services`, name]}
                        labelStyle={{ color: '#333' }}
                    />
                </PieChart>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 4 }}>
                {sortedCategoryData.map((category) => (
                    <Typography key={category.name} variant="body2">
                        <Box component="span" sx={{ color: category.color, fontWeight: "bold", mr: 1 }}>●</Box>
                        {category.name} <Box component="span" sx={{ float: "right" }}>{category.value}</Box>
                    </Typography>
                ))}
                {categoryChartData.length > 8 && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
                        +{categoryChartData.length - 8} more categories
                    </Typography>
                )}
            </Box>

            {/* Summary stats below the chart */}
            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Summary
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        Total Views <Box component="span" sx={{ float: "right" }}>{totalViews}</Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Total Comments <Box component="span" sx={{ float: "right" }}>{totalComments}</Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Total Reviews <Box component="span" sx={{ float: "right" }}>{totalReviews}</Box>
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default ServiceStats;
