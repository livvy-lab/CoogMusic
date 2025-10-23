import React, { useState } from 'react';
import './UserReport.css';

const UserReport = () => {
    const [reason, setReason] = useState(''); 
    const [details, setDetails] = useState('');
    // manage if the dropdown is open or closed
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        // validation to ensure a reason is selected
        if (!reason) {
            alert('Please select a reason.');
            return;
        }
        console.log({ reason, details });
    };

    // handle selecting an option
    const handleSelectOption = (selectedReason) => {
        setReason(selectedReason);
        setIsDropdownOpen(false); // close the dropdown after selection
    };

    const options = ["Inappropriate Content", "Copyright", "Other"];

    return (
        <form className="report-form-container" onSubmit={handleSubmit}>
            
            <h1>Submit a report</h1>
            <p className="reporting-info-text">You are reporting &lt;entity&gt; for:</p>
            <div className="custom-dropdown-wrapper">
                <button 
                    type="button" // prevents form submission on click
                    className="dropdown-trigger" 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    {reason || "Select a reason"}
                </button>

                {isDropdownOpen && (
                    <div className="dropdown-options">
                        {options.map((option) => (
                            <div
                                key={option}
                                className="dropdown-option"
                                onClick={() => handleSelectOption(option)}
                            >
                                {option}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <label htmlFor="details">Additional Details:</label>
            <textarea
                id="details"
                placeholder="Provide more information here..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
            />
            
            <button type="submit" className="submit-button">Submit</button>

        </form>
    );
};

export default UserReport;