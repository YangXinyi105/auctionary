import axios from "axios";
import { apiUrl } from './api';

const searchItems = (params = {}) => {

    return axios.get(
        apiUrl('/search'), { params, timeout: 10000 }
    )
    .then(response => {

        return { items: response.data, total: Number(response.headers['x-total-count']) };

    });

};


const getItem = (id) => {

    return axios.get(
        apiUrl(`/item/${id}`)
    )
    .then(response => {

        return response.data;

    });

};


export {
    searchItems,
    getItem
};
