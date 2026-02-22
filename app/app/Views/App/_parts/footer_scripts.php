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
    function number_length(maxLength, fieldId) {
        let input = document.getElementById(fieldId).value;
        if (input.length > maxLength) {
        document.getElementById(fieldId).value = input.slice(0, maxLength);
        }
    }
</script>