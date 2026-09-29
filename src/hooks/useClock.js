import { useState, useEffect } from 'react';

export function useClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours24 = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = (hours24 % 12 || 12).toString().padStart(2, '0');

  const formattedTime = `${hours12}:${minutes}:${seconds} ${ampm}`;
  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let greeting = 'Good evening';
  if (hours24 < 12) greeting = 'Good morning';
  else if (hours24 < 18) greeting = 'Good afternoon';

  const currentTimeHHMM = `${hours24.toString().padStart(2, '0')}:${minutes}`;

  return {
    time,
    currentTimeHHMM,
    formattedTime,
    formattedDate,
    greeting,
    hours24,
    minutes,
    seconds,
  };
}

export default useClock;
