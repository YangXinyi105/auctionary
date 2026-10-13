import { createRouter, createWebHashHistory } from 'vue-router'


import Home from '../views/pages/Home.vue'
import Sell from '../views/pages/Sell.vue'
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
            path: '/sell',
            name: 'Sell',
            component: Sell
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
        },
        { path: '/:pathMatch(.*)*', redirect: '/' }

    ]

})


export default router
