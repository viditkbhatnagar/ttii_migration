
<script src="<?=base_url()?>assets/app/js/pages/form-wizard.init.js"></script>



<!-- JAVASCRIPT -->
<script src="<?=base_url()?>assets/app/libs/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="<?=base_url()?>assets/app/libs/simplebar/simplebar.min.js"></script>
<script src="<?=base_url()?>assets/app/libs/node-waves/waves.min.js"></script>
<script src="<?=base_url()?>assets/app/libs/feather-icons/feather.min.js"></script>
<script src="<?=base_url()?>assets/app/js/pages/plugins/lord-icon-2.1.0.js"></script>
<script src="<?=base_url()?>assets/app/js/plugins.js"></script>






<!-- Sweet Alerts js -->
<script src="<?=base_url()?>assets/app/libs/sweetalert2/sweetalert2.min.js"></script>
<script type='text/javascript' src='https://cdn.jsdelivr.net/npm/toastify-js'></script>
<script src="<?=base_url()?>assets/app/libs/choices.js/public/assets/scripts/choices.min.js"></script>
<script src="<?=base_url()?>assets/app/libs/flatpickr/flatpickr.min.js"></script>

<!-- apexcharts -->

<script src="<?=base_url()?>assets/app/libs/apexcharts/apexcharts.min.js"></script>

<!-- Vector map-->
<script src="<?=base_url()?>assets/app/libs/jsvectormap/js/jsvectormap.min.js"></script>
<script src="<?=base_url()?>assets/app/libs/jsvectormap/maps/world-merc.js"></script>

<!--Swiper slider js-->
<script src="<?=base_url()?>assets/app/libs/swiper/swiper-bundle.min.js"></script>

<!-- Dashboard init -->
<script src="<?=base_url()?>assets/app/js/pages/dashboard-ecommerce.init.js"></script>

<!-- App js -->
<script src="<?=base_url()?>assets/app/js/app.js"></script>
<script src="<?=base_url()?>assets/app/js/common.js"></script>

<!-- glightbox js -->
<script src="<?=base_url()?>assets/libs/glightbox/js/glightbox.min.js"></script>

<script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.2.9/js/dataTables.responsive.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.print.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>

<script src="<?=base_url()?>assets/app/js/pages/password-addon.init.js"></script>


<script type="text/javascript">
    function checkCategoryType(category_type) {
        if (category_type > 0) {
            $('#thumbnail-picker-area').hide();
            $('#icon-picker-area').hide();
        }else {
            $('#thumbnail-picker-area').show();
            $('#icon-picker-area').show();
        }
    }
</script>
<script>
    function initializeTables() {
        new DataTable(".data_table_basic", {
            dom: "Bfrtip",
            buttons: ["csv", "excel", "print", "pdf"],
            // "fixedHeader": true,
            "pagingType": "full_numbers",
            // "scrollX": "400px",
            // "scrollY": "410px",
            "scrollCollapse": true,
            "paging": true,
            // pagingType: "full_numbers"
            // ajax: "assets/json/datatable.json"
        })
    }
    document.addEventListener("DOMContentLoaded", function () {
        initializeTables();
    });
$(document).ready(function() {
    $('.select2').select2();
});

$(document).ready(function() {

    $('#logout').click(function() {
        
        $.ajax({
            url: '<?=base_url('login/logout')?>',
            type: 'POST',
            dataType: 'json', 
            success: function(response) {
                
                console.log(response);
                
                if(response.hide_alert){
                    
                   window.location.href = response.log_out_link; 
                   
                }
                
                
                if(response.show_alert){
                   
                   
                        const swalWithBootstrapButtons = Swal.mixin({
                              customClass: {
                                confirmButton: "btn btn-success m-2",
                                cancelButton: "btn btn-danger m-2"
                              },
                              buttonsStyling: false
                            });
                            swalWithBootstrapButtons.fire({
                              title: "Are you sure?",
                              text: "Your Productive Time is Not Finished Your Total Time is "+ response.hours +"h : "+ response.minutes + "m",
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonText: "Leave",
                              cancelButtonText: "Cancel",
                              reverseButtons: true
                            }).then((result) => {
                              if (result.isConfirmed) {
                                
                                
                                 $.ajax({
                                        url: '<?=base_url();?>login/logout?logout=1', 
                                        type: 'POST',
                                        dataType: 'json',
                                        success: function(result) {
                                            console.log(result);
                                              if(result.leave){
                                                  
                                                 window.location.href = result.log_out_link;
                                                 
                                                }
                                        },
                                        error: function(xhr, status, error) {
                                            console.error(xhr.responseText);
                                        }
                                    });

                                
                        
                                
                                
                              } else if (
                                /* Read more about handling dismissals below */
                                result.dismiss === Swal.DismissReason.cancel
                              ) {
                                
                              }
                            });
                   
                   
                   
                    
                }
                
                
            },
            error: function(xhr, status, error) {

                console.error(xhr.responseText);
            }
        });
    });
});


</script>