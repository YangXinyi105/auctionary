import axios from "axios";


const searchItems = (params = {}) => {

    return axios.get(
        "http://localhost:3334/search", { params, timeout: 10000 }
    )
    .then(response => {

        return { items: response.data, total: Number(response.headers['x-total-count']) };

    });

};


const getItem = (id) => {

    return axios.get(
        `http://localhost:3334/item/${id}`
    )
    .then(response => {

        return response.data;

    });

};


export {
    searchItems,
    getItem
};
