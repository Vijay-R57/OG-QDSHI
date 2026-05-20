
export const getInitialStatusArray = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // Current Month (0-11)

   const daysInMonth = new Date(year, month + 1, 0).getDate();
  const arr = Array(daysInMonth).fill("none");

  for (let i = 0; i < daysInMonth; i++) {
    const date = new Date(year, month, i + 1);
    const dayOfWeek = date.getDay();
 
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      arr[i] = "none"; 
    } else {
       arr[i] = "none";
    }
  }

  return arr;
};

export const dashboardMetrics = [
  { id: 2, label: 'QUALITY',   letter: 'Q', value: '20%', unit: 'Product Defect Rate',   alerts: 0, success: 0 },
  { id: 3, label: 'DELIVERY',  letter: 'D', value: '5%',  unit: 'Budget Adherence',       alerts: 0, success: 0 },
  { id: 4, label: 'HEALTH',    letter: 'H', value: '84%', unit: 'On-Time Delivery Rate',  alerts: 0, success: 0 },
  { id: 1, label: 'SAFETY',    letter: 'S', value: '14',  unit: 'Days without Injuries',  alerts: 0, success: 0 },
  { id: 5, label: 'IDEATION',  letter: 'I', value: '6hr', unit: 'Training & Development', alerts: 0, success: 0 },
].map(metric => ({
  ...metric,
  // This now runs dynamically for the current month
  daysData: getInitialStatusArray(),
  issueLogs: {} 
}));