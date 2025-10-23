import React, { useState } from 'react';
import './UserReport.css';

const UserReport = () => {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        console.log({
            reason: reason,
            details: details,
        });
    };

    return (
        <form className="report-form-container" onSubmit={handleSubmit}>
            {/* Header frame */}
            <div className="frame-header">
                <h1>Submit a report</h1>
            </div>
            
            {/* Reporting info and dropdown frame */}
            <div className="reporting-info">
                <p>You are reporting &lt;entity&gt; for:</p>
                <select value={reason} onChange={(e) => setReason(e.target.value)} required>
                    <option value="" disabled>Select a reason</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Copyright">Copyright</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            
            {/* Additional Details label frame */}
            <div className="frame-details-label">
                <label htmlFor="details">Additional Details:</label>
            </div>
            
            {/* Textarea wrapper */}
            <div className="textarea-wrapper"> 
                <textarea
                    id="details"
                    placeholder="Provide more information here..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                />
            </div>
            
            {/* Submit Button frame */}
            <div className="frame-submit-wrapper">
                <button type="submit" className="submit-button">Submit</button>
            </div>
        </form>
    );
};

export default UserReport;