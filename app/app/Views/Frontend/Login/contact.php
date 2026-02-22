    <div class="contact-form-container">
        <div id="success-message" class="hidden">Thank you! Your message has been sent.</div>   
        <h2>Contact Us</h2>
        <form id="contact-form">
            <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit">Submit</button>
        </form>
    </div>
    
    
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .contact-form-container {
            background-color: #fff;
            padding: 20px 25px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 500px;
        }
        
        .contact-form-container h2 {
            margin-bottom: 15px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        }
        
        button {
            width: 100%;
            padding: 10px;
            background-color: #007BFF;
            border: none;
            border-radius: 4px;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
        }
        
        button:hover {
            background-color: #0056b3;
        }
        .hidden {
            display: none;
        }
        
        #success-message {
            margin-top: 15px;
            padding: 10px;
            border: 1px solid #4caf50;
            background-color: #dff0d8;
            color: #3c763d;
            border-radius: 4px;
        }
    </style>
    <script>
        document.getElementById('contact-form').addEventListener('submit', function(event) {
            event.preventDefault();
            // Optionally, you can add form validation here
        
            // Show the success message
            var successMessage = document.getElementById('success-message');
            successMessage.classList.remove('hidden');
            
            // Hide the success message after 2 seconds
            setTimeout(function() {
                successMessage.classList.add('hidden');
            }, 2000);
        
            // Clear the form
            event.target.reset();
        });
    </script>