import React from 'react';

const Settings: React.FC = () => {
    return (
        <div>
            <h1>User Profile Settings</h1>
            <form>
                <label>
                    Username:
                    <input type="text" name="username" />
                </label>
                <br />
                <label>
                    Email:
                    <input type="email" name="email" />
                </label>
                <br />
                <label>
                    Password:
                    <input type="password" name="password" />
                </label>
                <br />
                <button type="submit">Save Changes</button>
            </form>
            <h2>Account Preferences</h2>
            <form>
                <label>
                    Notifications:
                    <input type="checkbox" name="notifications" />
                </label>
                <br />
                <label>
                    Dark Mode:
                    <input type="checkbox" name="darkMode" />
                </label>
                <br />
                <button type="submit">Update Preferences</button>
            </form>
            <h2>Configuration Options</h2>
            <form>
                <label>
                    Region:
                    <select name="region">
                        <option value="us">US</option>
                        <option value="eu">EU</option>
                        <option value="asia">Asia</option>
                    </select>
                </label>
                <br />
                <button type="submit">Apply Configurations</button>
            </form>
        </div>
    );
};

export default Settings;