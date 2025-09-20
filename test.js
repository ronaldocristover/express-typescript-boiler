import http from 'k6/http';
import { check, Trend } from 'k6';

export let options = {
    vus: 10,
    duration: '10s',
};

// Removed custom Trend metric as it is not used correctly

export default function () {
    const url = 'http://localhost:8888/api/users';
    const payload = JSON.stringify({ name: 'Test k6s' + new Date().getTime() });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    let res = http.post(url, payload, params);

    check(res, {
        'status is 201': (r) => r.status === 201,
    });

    // Removed incorrect metric usage
}