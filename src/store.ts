import { Post, User } from './types';
// @ts-ignore
import guestAvatar from '../assets/guest_avatar.jpg';

const INITIAL_USERS: User[] = [
  {
    id: 'user_1',
    username: 'stardust_traveler',
    displayName: 'Stardust',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=stardust_traveler',
    bio: 'Exploring Hogwarts and the MCU. 🌌✨',
    followers: ['user_2', 'user_3'],
    following: ['user_2'],
  },
  {
    id: 'user_2',
    username: 'reality.jumper',
    displayName: 'Reality Jumper',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=reality.jumper',
    bio: 'Permanent shifter. Happy to help others.',
    followers: ['user_1'],
    following: ['user_1', 'user_3'],
  },
  {
    id: 'user_3',
    username: 'dr_dreamer',
    displayName: 'Luna',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=dr_dreamer',
    bio: 'Waiting Room is my happy place.',
    followers: ['user_2'],
    following: [],
  },
];

const INITIAL_POSTS: Post[] = [
  {
    id: 'post_1',
    userId: 'user_1',
    title: 'Minha primeira experiência de Shifting para Hogwarts! ⚡🔮',
    content: 'Gente, eu finalmente consegui! Fiquei lá por cerca de 3 dias (tempo da DR) e a sensação de sentir a lareira do Salão Comunal da Grifinória é simplesmente real demais! Usei o método Raven combinado com meditação guiada antes de dormir. Não desistam, a persistência é o segredo!',
    hashtags: ['shifting', 'hogwarts', 'dr', 'relato'],
    likes: ['user_2'],
    comments: [
      {
        id: 'comment_1',
        postId: 'post_1',
        userId: 'user_2',
        content: 'Que incrível! Parabéns pela conquista! 😍',
        createdAt: Date.now() - 3600000
      }
    ],
    createdAt: Date.now() - 7200000
  },
  {
    id: 'post_2',
    userId: 'user_2',
    title: 'Dica de Ouro: Sintomas não são regras! 🧠✨',
    content: 'Muitos shifters desistem porque acham que precisam sentir sintomas como formigamento ou luzes piscando para conseguir transicionar. A verdade é que os sintomas são apenas seu corpo físico adormecendo. Foquem na intenção e na conexão com a sua DR, não nos sintomas físicos!',
    hashtags: ['shifting', 'metodos', 'dicas'],
    likes: ['user_1', 'user_3'],
    comments: [],
    createdAt: Date.now() - 14400000
  }
];

// We will simulate a logged in user (the current user of the app)
export const CURRENT_USER: User = {
  id: 'user_me',
  username: 'new_shifter',
  displayName: 'Shifter01',
  avatar: guestAvatar,
  bio: 'Just started my journey.',
  followers: [],
  following: ['user_1', 'user_2'],
};

export const getStoredData = () => {
  try {
    const storedPosts = localStorage.getItem('shifting_posts');
    const storedUsers = localStorage.getItem('shifting_users');
    
    let posts = storedPosts ? JSON.parse(storedPosts) : INITIAL_POSTS;
    let users = storedUsers ? JSON.parse(storedUsers) : [...INITIAL_USERS, CURRENT_USER];
    
    return { posts, users };
  } catch (error) {
    return { posts: INITIAL_POSTS, users: [...INITIAL_USERS, CURRENT_USER] };
  }
};

export const saveData = (posts: Post[], users: User[]) => {
  localStorage.setItem('shifting_posts', JSON.stringify(posts));
  localStorage.setItem('shifting_users', JSON.stringify(users));
};
