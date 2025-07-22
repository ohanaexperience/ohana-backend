export type TimeSlot = {
    startTime: Date;
    endTime: Date;
};

export type ExperienceMeetingLocation = {
    instructions: string;
    image: ImageObject | null;
};

export type ImageObject = {
    mimeType: string;
    id: string;
    url: string;
    key: string;
};
