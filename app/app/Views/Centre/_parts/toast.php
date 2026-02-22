<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
<script type="text/javascript">
// show toast
<?php
if(session()->getFlashdata('message_success')){
    $message_success = session()->getFlashdata('message_success');
    echo "toast_success('{$message_success}')";
}

if(session()->getFlashdata('message_warning')){
    $message_warning = session()->getFlashdata('message_warning');
    echo "toast_warning('{$message_warning}')";
}

if(session()->getFlashdata('message_danger')){
    $message_danger = session()->getFlashdata('message_danger');
    echo "toast_error('{$message_danger}')";
}

if(session()->getFlashdata('message_primary')){
    $message_primary = session()->getFlashdata('message_primary');
    echo "toast_primary('{$message_primary}')";
}
?>

    // Toast Success
    function toast_success(message, duration = 3000){
        var myToastContent = document.createElement('div');
        myToastContent.innerHTML = '<div style="width:320px;">' + message + '</div>';
        Toastify({
            node: myToastContent,
            gravity: "top",
            position: "center",
            className: "success custom-toast-width",
            duration: duration,
            style: {
                background: "#39B39C",
            }
        }).showToast();
    }

    // Toast Warning
    function toast_warning(message, duration = 3000){
        var myToastContent = document.createElement('div');
        myToastContent.innerHTML = '<div style="width:320px;">' + message + '</div>';
        Toastify({
            node: myToastContent,
            gravity: "top",
            position: "center",
            className: "warning",
            duration: duration,
            style: {
                background: "#F6B84B"
            }
        }).showToast();
    }

    // Toast Error
    function toast_error(message, duration = 3000){
        var myToastContent = document.createElement('div');
        myToastContent.innerHTML = '<div style="width:320px;">' + message + '</div>';
        Toastify({
            node: myToastContent,
            gravity: "top",
            position: "center",
            className: "danger",
            duration: duration,
            style: {
                background: "#EF6547",
            }
        }).showToast();
    }

    // Toast Primary
    function toast_primary(message, duration = 3000){
        var myToastContent = document.createElement('div');
        myToastContent.innerHTML = '<div style="width:320px;">' + message + '</div>';
        Toastify({
            node: myToastContent,
            gravity: "top",
            position: "center",
            className: "primary",
            duration: duration
        }).showToast();
    }
</script>