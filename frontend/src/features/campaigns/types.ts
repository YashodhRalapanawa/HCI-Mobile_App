export interface Campaign {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  venue: string;
  location: { type: 'Point'; coordinates: [number, number] };
  date: string;
  startTime: string;
  endTime: string;
  organizer: string;
  capacity: number;
  registeredCount: number;
  spotsRemaining: number;
}
