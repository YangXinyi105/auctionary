import { createRouter, createWebHashHistory } from 'vue-router'


import Home from '../views/pages/Home.vue'
import Login from '../views/pages/login.vue'
import SingleItem from '../views/pages/SingleItem.vue'
import Account from '../views/pages/Account.vue'
import UserProfile from '../views/pages/UserProfile.vue'


const router = createRouter({

    history: createWebHashHistory(),

    scrollBehavior(to) {
        if (to.hash) return { el: to.hash, top: 88 }
        return { top: 0 }
    },

    routes: [
        { path: '/users/:id', name: 'UserProfile', component: UserProfile },

        {
            path: '/',
            name: 'Home',
            component: Home
        },

        {
            path: '/login',
            name: 'Login',
            component: Login
        },

        {
            path: '/item/:id',
            name: 'SingleItem',
            component: SingleItem
        },
        {
            path: '/account',
            name: 'Account',
            component: Account
        }

    ]

})


export default router
