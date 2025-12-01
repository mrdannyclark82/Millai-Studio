import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DataChartProps {
  config: {
    type: 'bar' | 'line' | 'pie';
    data: any;
    options?: any;
    title?: string;
  };
}

const DataChart: React.FC<DataChartProps> = ({ config }) => {
  const { type, data, options, title } = config;

  // Default options for dark mode visibility
  const defaultOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#e2e8f0' }
      },
      title: {
        display: !!title,
        text: title,
        color: '#e2e8f0'
      },
    },
    scales: type !== 'pie' ? {
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155' }
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155' }
      }
    } : undefined
  };

  const finalOptions = { ...defaultOptions, ...options };

  return (
    <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl my-4 shadow-lg">
      {type === 'bar' && <Bar data={data} options={finalOptions} />}
      {type === 'line' && <Line data={data} options={finalOptions} />}
      {type === 'pie' && <Pie data={data} options={finalOptions} />}
    </div>
  );
};

export default DataChart;