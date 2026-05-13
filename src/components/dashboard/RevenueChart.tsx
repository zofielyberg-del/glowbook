
'use client';

import { motion } from "framer-motion";

interface RevenueChartProps {
    currency: string;
    data?: number[];
}

export default function RevenueChart({ currency, data = [0, 0, 0, 0, 0, 0, 0] }: RevenueChartProps) {
    const chartData = data.length === 0 ? [0, 0, 0, 0, 0, 0, 0] : data;
    const maxVal = Math.max(...chartData);
    const max = maxVal === 0 ? 1 : maxVal;

    return (
        <div className="h-48 flex items-end justify-between gap-2 pt-8">
            {data.map((value, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex flex-col items-center">
                        {/* Value Tooltip */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileHover={{ opacity: 1, y: 0 }}
                            className="absolute -top-10 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-1 rounded-md opacity-0 transition-opacity pointer-events-none z-10 whitespace-nowrap"
                        >
                            {value.toLocaleString()} {currency}
                        </motion.div>

                        {/* Bar */}
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(value / max) * 100}%` }}
                            transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                            className="w-full bg-gradient-to-t from-champagne-600/20 to-champagne-500 rounded-t-lg group-hover:from-champagne-600 group-hover:to-champagne-400 transition-all cursor-pointer relative"
                        />
                    </div>
                    <span className="text-[10px] text-foreground/30 font-bold uppercase tracking-tighter">Dag {i + 1}</span>
                </div>
            ))}
        </div>
    );
}
