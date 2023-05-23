import axios from "axios"
import express from "express"
import mysql from "mysql"

let connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.password,
  database: 'events_db',
  port: 3306
});

connection.connect(function (err) {
  if (err) {
    return console.error('error: ' + err.message);
  }

  console.log('Connected to the MySQL server.');
});




const app = express()


app.get("/health", async (req, res) => {
  res.status(200).json({
    message: "hi 🤝 I am good",
  });
});

const api_url = `https://api.reservoir.tools/events/asks/v3?limit=1000`

const fetchEventsContinuation = async (url_continuation) => {
  const api_response = await axios.get(url_continuation)

  if (api_response.status !== 200) fetchEvents(url_continuation)
  const { events, continuation } = api_response.data

  return { events, continuation }

}

const save_events = async (events) => {

  let new_order = events.filter((ev) => { return ev.event.kind === "new-order" })
  let activities = new_order.map((evord) => {
    let { event: { createdAt }, order: { contract, criteria: { data: { token: { tokenId } } }, price: { amount: { native } }, maker, validFrom, validTo } } = evord
    let activity_obj = {
      contract_address: contract,
      token_index: tokenId,
      listing_price: native,
      maker: maker,
      listing_from: validFrom,
      listing_to: validTo,
      event_timestamp: createdAt
    }

    return activity_obj
  })


  const insert_columns = Object.keys(activities[0]);

  const insert_data = activities.reduce((a, i) => [...a, Object.values(i)], []);

  connection.query(`INSERT INTO activity (??) VALUES ?`, [insert_columns, insert_data], (error, data) => {


    console.log({ error, data })
  })



}

export const fetchEvents = async (url) => {
  try {

    let this_round_response = []
    const api_response = (await axios.get(url))

    if (api_response.status !== 200) {

      fetchEvents(url)
    }
    let { events, continuation } = api_response.data //events is an array, continuation is string
    let new_order = events.filter((ev) => {
      return ev.event.kind === "new-order"
    })

    save_events(events)

    while (continuation) {

      let cont_resp = await fetchEventsContinuation(`${url}&continuation=${continuation}`)
      continuation = cont_resp.continuation
      events = cont_resp.events
      let new_order = events.filter((ev) => { return ev.event.kind === "new-order" })

      save_events(events)


    }
    await fetchEvents()





    return { success: false, status: 400 }
  } catch (error) {
    return { success: false, status: 500, message: error.message }
  }
}

const port = process.env.port || 3030;


app.listen(port, () => {
  console.log(` @ ${port}`);
});
fetchEvents(api_url)
export { app };

