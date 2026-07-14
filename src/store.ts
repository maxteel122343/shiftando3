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
    title: 'Minha primeira mudança rápida (mini-shift) para Hogwarts!',
    content: "Eu finalmente consegui! Foi apenas por alguns minutos, mas eu pude literalmente sentir o cheiro de pergaminho e livros antigos no salão comunal. Usei o método Raven combinado com um subliminar de 505Hz. Não desistam pessoal, é muito real!",
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&auto=format&fit=crop&q=60',
    hashtags: ['#hogwarts', '#minishift', '#metodoraven', '#sucesso'],
    likes: ['user_2', 'user_3'],
    comments: [
      {
        id: 'comment_1',
        postId: 'post_1',
        userId: 'user_2',
        content: "Parabéns!! Estou muito orgulhoso(a). Você colocou no script que sentiria o cheiro dos livros?",
        createdAt: Date.now() - 3600000,
      }
    ],
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'post_2',
    userId: 'user_2',
    title: 'Dicas para se manter fixado (grounding) na sua DR',
    content: 'Muitas pessoas voltam para a CR sem querer porque ficam muito animadas ao chegar. Quando você chegar na sua Realidade Desejada, a primeira coisa que deve fazer é tocar em algo. Sinta a textura. Fixar-se nas sensações físicas da sua DR evita que você seja puxado de volta prematuramente.',
    hashtags: ['#dicas', '#grounding', '#ajuda'],
    likes: ['user_1'],
    comments: [],
    createdAt: Date.now() - 86400000,
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
