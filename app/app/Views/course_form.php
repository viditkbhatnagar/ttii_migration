<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>AI Course Content Generator</title>
    <!--<link rel="stylesheet" href="<?= base_url('css/style.css') ?>">-->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <style>
        body {
            background-color: #f8f9f7;
            /* Off-white */
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 30px 0;
        }
        
        .form-container {
            background: #ffffff;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0, 128, 0, 0.1);
            width: 100%;
            max-width: 600px;
            text-align: center;
            border: 2px solid #28a745;
            /* green border */
        }
        
        h2 {
            color: #28a745;
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin: 15px 0 5px;
            font-weight: bold;
            color: #333;
            text-align: left;
        }
        
        input[type="text"],
        textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 8px;
            font-size: 14px;
            resize: vertical;
            box-sizing: border-box;
        }
        
        button {
            background-color: #28a745;
            color: #fff;
            padding: 12px 20px;
            margin: 15px 0;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        }
        
        button:hover {
            background-color: #218838;
        }
    </style>
</head>

<body>

    <div class="form-container">
        <h2>AI Course Content Generator</h2>

        <form id="courseForm" method="post" action="<?= base_url('course/generate') ?>">
            <label>Course Title:</label>
            <input type="text" id="title" name="title">

            <button type="button" id="generate">Generate AI Content</button>

            <label>Short Description:</label>
            <textarea id="short_description" name="short_description" rows="5"></textarea>

            <label>Outcomes:</label>
            <textarea id="outcomes" name="outcomes" rows="5"></textarea>

            <label>Requirements:</label>
            <textarea id="requirements" name="requirements" rows="5"></textarea>

            <label>Course Description:</label>
            <textarea id="course_description" name="course_description" rows="7"></textarea>
        </form>
    </div>

    <script>
        $('#generate').on('click', function() {
            const title = $('#title').val();
                console.log(title);
            if (!title.trim()) {
                alert('Please enter a course title!');
                return;
            }

            $('#generate').text('Generating...').prop('disabled', true);

            $.post("<?= base_url('course/generate') ?>", {
                title: title
            }, function(data) {
                if (data.error) {
                    alert("Error: " + data.error);
                } else {
                    console.log(data);
                    $('#short_description').val(data.short_description);
                    $('#outcomes').val(data.outcomes);
                    $('#requirements').val(data.requirements);
                    $('#course_description').val(data.course_description);
                }
            }).fail(function(xhr) {
                console.error("Fail Response:", xhr.responseText);
                alert('An error occurred. Please try again.');
            }).always(function() {
                $('#generate').text('Generate AI Content').prop('disabled', false);
            });
        });
    </script>

</body>

</html>