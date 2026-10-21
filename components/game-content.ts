import type { TrainKind } from "@/lib/railway/types";
export const engines: {
  kind: TrainKind;
  name: string;
  nickname: string;
  description: string;
}[] = [
  {
    kind: "steam",
    name: "Classic Steam Engine",
    nickname: "The Little Steamer",
    description: "A cheerful puff of adventure",
  },
  {
    kind: "diesel",
    name: "Diesel Locomotive",
    nickname: "Bluebird Diesel",
    description: "Ready for the long way round",
  },
  {
    kind: "electric",
    name: "Electric Passenger Train",
    nickname: "The Sunshine Express",
    description: "A bright spark on the rails",
  },
];
export const tourSteps = [
  {
    title: "Every adventure starts with a track",
    text: "Choose a straight track from your building box below.",
  },
  {
    title: "Find a little patch of grass",
    text: "Tap the board to place your track. You can drag it, too!",
  },
  {
    title: "Let’s go around the bend",
    text: "Choose a curve and place it. Rotate turns it any way you like.",
  },
  {
    title: "Bring it all together",
    text: "Join your tracks into a loop. Pale dots show the ends to connect.",
  },
  {
    title: "Meet your travelling companion",
    text: "Choose an engine on the right. Then tap a track to set it down.",
  },
  {
    title: "All aboard!",
    text: "Press Play and watch your little railway come to life.",
  },
];
