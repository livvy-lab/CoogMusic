import React from 'react';
import PageLayout from "../components/PageLayout/PageLayout";
import UserReportForm from "../components/UserReport/UserReport";

const UserReportPage = () => {
  return (
    <PageLayout>
      <div className="user-report-content">
        <UserReportForm />
      </div>
    </PageLayout>
  );
};


export default UserReportPage;