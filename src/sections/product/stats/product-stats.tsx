import React from "react";
import { Box, Typography } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

interface Product {
    total_views: number;
    comments: string[];
    total_reviews: number;
    category?: string[];
}

interface ProductStatsProps {
    products?: Product[];
}

const ProductStats: React.FC<ProductStatsProps> = ({ products }) => {
    // Aggregate stats
    const totalViews = products?.reduce((acc, product) => acc + product.total_views, 0);
    const totalComments = products?.reduce((acc, product) => acc + product.comments.length, 0);
    const totalReviews = products?.reduce((acc, product) => acc + product.total_reviews, 0);
    const totalProducts = products?.length;

    const chartData = [
        { name: 'Total Views', value: totalViews, color: '#FF9B33' },
        { name: 'Total Comments', value: totalComments, color: '#83D475' },
        { name: 'Total Reviews', value: totalReviews, color: '#FFE381' },
    ];

    // Generate chart data based on categories
    const categoryCounts: Record<string, number> = {};
    products?.forEach(product => {
        if (product.category) {  // Ensure category is defined
            product.category.forEach(cat => {
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
        }
    });



    return (
        <Box>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {totalProducts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Total Products
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

export default ProductStats;