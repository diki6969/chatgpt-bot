const axios = require("axios");
module.exports = async (m, out, kyy, a) => {
  let response = await axios.post(
        "https://tikwm.com/api/",
        `url=${encodeURIComponent(out.input)}`
    )
    let data = response.data
}