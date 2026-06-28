import { EBook } from '../types';

export const MOCK_EBOOKS: EBook[] = [
  {
    id: 'ebook_1',
    title: 'NOCTURNAL FLOW',
    coverImage: 'https://images.unsplash.com/photo-1531604250646-2f0e818c4f06?q=80&w=600&auto=format&fit=crop', // Dark minimalist cover
    description: 'Aproveite o estado Theta para um shifting calmo, seguro e profundo.',
    content: 'The boundaries of the nocturnal mind are vastly uncharted. When we shift our focus from the glaring daylight of conscious thought into the profound depths of the midnight consciousness, we unlock pathways previously obscured by the noise of waking life.\n\nIn this volume, we will explore the methodologies of deep-state shifting, a practice designed to leverage the brain\'s theta wave states to transition seamlessly into your Desired Reality.\n\nChapter 1: The Silence Between Thoughts\n\nIt begins not with effort, but with surrender. As the physical body powers down, the consciousness must be trained to remain a solitary sentinel. This is the essence of the Nocturnal Flow. Imagine your awareness as a single point of light in an infinitely vast, dark room. You are not trying to illuminate the room; you are simply maintaining the light.\n\nBy practicing sensory deprivation techniques combined with rhythmic breathing, one can induce the mind-awake, body-asleep state within minutes. From this precipice, the leap into another reality is not a jump, but a gentle stepping over a threshold.',
    likes: [],
    audioTracks: [
      {
        id: 'mock_1_t1',
        title: 'Theta Waves 6Hz (Deep Shifting)',
        url: 'https://assets.mixkit.co/music/preview/mixkit-ethereal-fairy-lullaby-121.mp3',
        triggerProgress: 0,
        fadeInSec: 2,
        fadeOutSec: 2
      },
      {
        id: 'mock_1_t2',
        title: 'Hogwarts Great Hall (Ambiance)',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        triggerProgress: 20,
        fadeInSec: 3,
        fadeOutSec: 3
      },
      {
        id: 'mock_1_t3',
        title: 'Deep Space Astral (Cosmic Shift)',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        triggerProgress: 50,
        fadeInSec: 2,
        fadeOutSec: 2
      }
    ]
  },
  {
    id: 'ebook_karmico',
    title: 'O PROBLEMA DO SHIFT KÁRMICO',
    coverImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop', // Mystical/zen cover
    description: 'Compreenda a influência do karma e os bloqueios que impedem a transição de realidade.',
    content: 'O Shifting e as leis do karma estão profundamente interligados. Muitas vezes, bloqueios que impedem a transição completa de realidade vêm de pendências kármicas da nossa realidade atual (CR).\n\nPara superar esses obstáculos, é preciso realizar um alinhamento energético e liberar antigos padrões mentais.\n\nCapítulo 1: O Peso do Subconsciente\n\nNossas crenças limitantes agem como correntes invisíveis. Quando tentamos mudar para uma Realidade Desejada (DR), qualquer apego excessivo ou sentimento de culpa na CR criará uma resistência no subconsciente. O desapego kármico não significa esquecer as pessoas, mas sim curar as pendências emocionais para que a consciência flua livremente.',
    likes: [],
    audioTracks: [
      {
        id: 'mock_karmico_t1',
        title: 'Zen Meditation Flute (Karmic Release)',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        triggerProgress: 0,
        fadeInSec: 3,
        fadeOutSec: 3
      }
    ]
  }
];
