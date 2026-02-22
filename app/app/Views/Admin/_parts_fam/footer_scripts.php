<style>
    .cke_notification_warning{
        display:none;
    }
</style>

<script>

  


    $('.numberonly').on('keypress',function(e){
        var deleteCode = 8;  var backspaceCode = 46;
        var key = e.which;
        if ((key>=48 && key<=57) || key === deleteCode || key === backspaceCode || (key>=37 &&  key<=40) || key===0)    
        {    
            character = String.fromCharCode(key);
            if( character != '.' && character != '%' && character != '&' && character != '(' && character != '\'' ) 
            { 
                return true; 
            }
            else { return false; }
         }
         else   { return false; }
    });


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
    
    const fromDateInput = document.getElementById('from_date');
    const toDateInput = document.getElementById('to_date');

    fromDateInput.addEventListener('change', function () {
        // Set the minimum value of the "To date" based on the selected "From date"
        toDateInput.min = fromDateInput.value;

        // If the current "To date" is earlier than the "From date", clear it
        if (toDateInput.value < fromDateInput.value) {
            toDateInput.value = '';
        }
    });
</script>