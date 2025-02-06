import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // Connect to backend

export default function Home() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [chat, setChat] = useState("");
  const [typingStatus, setTypingStatus] = useState("");

  const fetchContacts = async () => {
    const { data } = await axios.get("/contacts", { params: { userId: "user123" } });
    setContacts(data.contacts);
  };

  useEffect(() => {
    fetchContacts();

    socket.on("chat", (message) => {
      if (message.to === "user123") {
        alert(`New message from ${message.from}: ${message.text}`);
      }
    });

    socket.on("typing", (data) => {
      if (data.to === "user123") {
        setTypingStatus(`${data.from} is typing...`);
      }
    });
  }, []);

  const handleSearchChange = (e) => setSearch(e.target.value);
  const handleFilterChange = (e) => setFilter(e.target.value);

  const handleEditContact = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/contacts/${id}`);
      const contactData = response.data;

      const updatedContact = {
        name: prompt("Enter new name:", contactData.name),
        companyName: prompt("Enter new company name:", contactData.companyName),
        email: prompt("Enter new email:", contactData.email),
        phoneNumber: prompt("Enter new phone number:", contactData.phoneNumber),
        country: prompt("Enter new country:", contactData.country),
        industry: prompt("Enter new industry:", contactData.industry),
      };

      if (Object.values(updatedContact).some((val) => !val)) {
        alert("All fields are required!");
        return;
      }

      await axios.put(`http://localhost:5000/contacts/${id}`, updatedContact);
      fetchContacts();
      alert("Contact updated successfully!");
    } catch (error) {
      console.error("Error updating contact:", error);
      alert("Failed to update contact. Please try again.");
    }
  };

  const handleDeleteContact = async (id) => {
    await axios.delete(`/contacts/${id}`);
    setContacts(contacts.filter((contact) => contact._id !== id));
  };

  const handleSendMessage = (to) => {
    socket.emit("chat", { from: "user123", to, text: chat });
    setChat("");
  };

  const handleTyping = (to) => {
    socket.emit("typing", { from: "user123", to, typing: true });
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(search.toLowerCase()) &&
    (filter ? contact.industry === filter : true)
  );

  return (
    <div>
      <input type="text" placeholder="Search Contacts" value={search} onChange={handleSearchChange} />
      <select onChange={handleFilterChange}>
        <option value="">All Industries</option>
        <option value="Tech">Tech</option>
        <option value="Finance">Finance</option>
      </select>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Email</th>
            <th>Phone Number</th>
            <th>Country</th>
            <th>Industry</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredContacts.map((contact) => (
            <tr key={contact._id}>
              <td>{contact.name}</td>
              <td>{contact.companyName}</td>
              <td>{contact.email}</td>
              <td>{contact.phoneNumber}</td>
              <td>{contact.country}</td>
              <td>{contact.industry}</td>
              <td>
                <button onClick={() => setSelectedContact(contact)}>Chat</button>
                <button onClick={() => handleEditContact(contact._id)}>Edit</button>
                <button onClick={() => handleDeleteContact(contact._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedContact && (
        <div>
          <h2>Chat with {selectedContact.name}</h2>
          <textarea
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            onKeyUp={() => handleTyping(selectedContact._id)}
          ></textarea>
          <button onClick={() => handleSendMessage(selectedContact._id)}>Send</button>
          <div>{typingStatus}</div>
        </div>
      )}
    </div>
  );
}
