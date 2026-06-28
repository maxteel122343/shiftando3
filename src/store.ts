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
    title: 'My first mini-shift to Hogwarts!',
    content: "I finally did it! It was only for a few minutes, but I could literally smell the parchment and old books in the common room. I used the Raven method combined with a 505Hz subliminal. Don't give up guys, it is so real!",
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&auto=format&fit=crop&q=60',
    hashtags: ['#hogwarts', '#minishift', '#ravenmethod', '#success'],
    likes: ['user_2', 'user_3'],
    comments: [
      {
        id: 'comment_1',
        postId: 'post_1',
        userId: 'user_2',
        content: "Omg congratulations!! I'm so proud of you. Did you script that you would smell books?",
        createdAt: Date.now() - 3600000,
      }
    ],
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'post_2',
    userId: 'user_2',
    title: 'Tips for staying grounded in your DR',
    content: 'A lot of people shift back accidentally because they get too excited. When you arrive in your Desired Reality, the first thing you should do is touch something. Feel the texture. Grounding yourself in the physical sensations of your DR prevents premature pulling back to your CR.',
    hashtags: ['#tips', '#grounding', '#shiftinghelp'],
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
