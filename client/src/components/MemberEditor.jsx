import React from "react";

export default function MemberEditor({ member }) {
  const [formData, setFormData] = React.useState({
    siege_score: member.siege_score,
    initial_xp: member.initial_xp,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Add your update logic here
  };

  return <form onSubmit={handleSubmit}>{/* Add your form fields here */}</form>;
}
