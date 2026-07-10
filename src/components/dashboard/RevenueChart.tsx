
'use client';

import { motion } from "framer-motion";

interface RevenueChartProps {
    currency: string;
    data?: number[];
    labels?: string[];
}

export default function RevenueChart({ currency, data = [], labels = [] }: RevenueChartProps) {
    const chartData = data.length === 0 ? [0, 0, 0, 0, 0, 0, 0] : data;
    const maxVal = Math.max(...chartData);
    const max = maxVal === 0 ? 1 : maxVal;

    return (
        <div className="h-48 flex items-end justify-between gap-1 pt-8">
            {chartData.map((value, i) => {
                const label = labels[i] || `Dag ${i + 1}`;
                const showLabel = chartData.length <= 7 || i % 5 === 0 || i === chartData.length - 1;

                return (
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
                                transition={{ duration: 0.8, delay: i * 0.02, ease: "easeOut" }}
                                className="w-full bg-gradient-to-t from-champagne-600/20 to-champagne-500 rounded-t-sm group-hover:from-champagne-600 group-hover:to-champagne-400 transition-all cursor-pointer relative"
                            />
                        </div>
                        {showLabel ? (
                            <span className="text-[9px] text-foreground/30 font-bold uppercase tracking-tighter text-center whitespace-nowrap">
                                {label}
                            </span>
                        ) : (
                            <span className="text-[9px] text-transparent select-none font-bold uppercase tracking-tighter text-center">
                                .
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
