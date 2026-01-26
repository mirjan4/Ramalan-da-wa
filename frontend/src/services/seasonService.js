import { useEffect, useState } from "react";
import axios from "axios";

export default function useActiveSeason() {
  const [season, setSeason] = useState(null);

  useEffect(() => {
    axios.get("/api/seasons/active", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    }).then(res => setSeason(res.data));
  }, []);

  return season;
}
