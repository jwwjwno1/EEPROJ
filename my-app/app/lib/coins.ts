export const giftOptions = [
  { name: "小心心", coinCost: 5 },
  { name: "奶茶", coinCost: 10 },
  { name: "花束", coinCost: 20 },
  { name: "皇冠", coinCost: 50 },
];

export const getOrderCoins = (price: number, minutes: number, role?: string | null) => {
  if (role === "技术陪玩") {
    return Math.max(1, Math.ceil(price * Math.max(1, Math.ceil(minutes / 30))));
  }

  return Math.max(1, Math.ceil(price * (minutes / 60)));
};

export const getLateFee = (appointment: Date) => {
  const hour = appointment.getHours();
  const minute = appointment.getMinutes();

  return hour > 23 || (hour === 23 && minute >= 30) ? 5 : 0;
};

export const getAppointmentEndTime = (appointment: Date, duration: number) =>
  new Date(appointment.getTime() + duration * 60 * 1000);
