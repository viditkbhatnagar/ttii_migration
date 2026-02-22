<!--<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>-->
<script>
// window.addEventListener('unload', function(event) {
//     // Display the warning message
//     alert("Are you sure you want to leave? Your changes may not be saved.");
// });
</script>

<script>
// Function to display warning message
// function displayCloseWarning(event) {
//     // Customize the warning message
//     var warningMessage = "Are you sure you want to leave this website? Your changes may not be saved.";

//     // Set the warning message
//     event.returnValue = warningMessage;

//     // Return the warning message
//     return warningMessage;
// }

// Add event listener for beforeunload event
// window.addEventListener("beforeunload", displayCloseWarning);
</script>
<script>

    function call_ajax_view(url, update_element){
        $.ajax({
            url: url,
            success: function(response) {
                $(update_element).html(response);
            },
            error: function(xhr, status, error) {
                console.error("AJAX Error: " + status + "\nError: " + error);
            }
        });
    }
</script>
