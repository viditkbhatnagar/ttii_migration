



<!-- JAVASCRIPT -->
<script src="<?=base_url()?>assets/admin/libs/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="<?=base_url()?>assets/admin/libs/simplebar/simplebar.min.js"></script>
<script src="<?=base_url()?>assets/admin/libs/node-waves/waves.min.js"></script>
<script src="<?=base_url()?>assets/admin/libs/feather-icons/feather.min.js"></script>
<script src="<?=base_url()?>assets/admin/js/pages/plugins/lord-icon-2.1.0.js"></script>
<script src="<?=base_url()?>assets/admin/js/plugins.js"></script>




<!-- Sweet Alerts js -->
<script src="<?=base_url()?>assets/admin/libs/sweetalert2/sweetalert2.min.js"></script>

<script type='text/javascript' src='https://cdn.jsdelivr.net/npm/toastify-js'></script>
<script src="<?=base_url()?>assets/admin/libs/choices.js/public/assets/scripts/choices.min.js"></script>
<script src="<?=base_url()?>assets/admin/libs/flatpickr/flatpickr.min.js"></script>


<!-- apexcharts -->

<script src="<?=base_url()?>assets/admin/libs/apexcharts/apexcharts.min.js"></script>
<script src="<?=base_url('assets/admin/libs/chart.js/chart.umd.js')?>"></script>

<!-- Vector map-->
<script src="<?=base_url()?>assets/admin/libs/jsvectormap/js/jsvectormap.min.js"></script>
<script src="<?=base_url()?>assets/admin/libs/jsvectormap/maps/world-merc.js"></script>

<!--Swiper slider js-->
<script src="<?=base_url()?>assets/admin/libs/swiper/swiper-bundle.min.js"></script>

<!-- Dashboard init -->
<script src="<?=base_url()?>assets/admin/js/pages/dashboard-analytics.init.js"></script>
<script src="<?=base_url('assets/admin/js/pages/chartjs.init.js')?>"></script>

<!-- snow editor -->
<script src="<?=base_url()?>assets/admin/libs/@ckeditor/ckeditor5-build-classic/build/ckeditor.js"></script>
<!-- <script src="https://cdn.ckeditor.com/ckeditor5/39.0.1/classic/ckeditor.js"></script> -->


<!-- quill js -->
<script src="<?=base_url()?>assets/admin/libs/quill/quill.min.js"></script>

<!-- init js -->
<!--<script src="<?=base_url()?>assets/admin/js/pages/form-editor.init.js"></script>-->

<!-- App js -->
<script src="<?=base_url()?>assets/admin/js/app.js"></script>

<script src="https://cdn.datatables.net/fixedheader/3.4.0/js/dataTables.fixedHeader.min.js"></script>


<script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.2.9/js/dataTables.responsive.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.print.min.js"></script>
<script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pdfmake@0.1.68/build/pdfmake.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pdfmake@0.1.68/build/vfs_fonts.js"></script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0/js/select2.min.js"></script>
<!-- Moment.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>
<!-- FullCalendar JS -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/3.10.2/fullcalendar.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>

<script>
    function initializeTables() {
        // Get the page title dynamically
        const pageTitle = document.title;

        // Initialize the first table with class 'data_table_basic'
        new DataTable(".data_table_basic", {
            dom: "Bfrtip",
            pageLength: 10, // Limit to 10 rows in the table view
            buttons: [
                {
                    extend: 'csv',
                    text: 'Export CSV',
                    filename: pageTitle, // Set the downloaded file name to the page title
                    exportOptions: {
                        columns: ':not(:last-child)', // Exclude the last column
                    },
                },
                {
                    extend: 'excel',
                    text: 'Export Excel',
                    filename: pageTitle, // Set the downloaded file name to the page title
                    exportOptions: {
                        columns: ':not(:last-child)', // Exclude the last column
                    },
                },
                {
                    extend: 'print',
                    text: 'Print',
                    title: pageTitle, // Set the printed title to the page title
                    exportOptions: {
                        columns: ':not(:last-child)', // Exclude the last column
                    },
                    customize: function (win) {
                        $(win.document.body)
                            .css('font-size', '10pt')
                            .find('table')
                            .addClass('compact')
                            .css('font-size', 'inherit');
                    },
                },
                {
                    extend: 'pdf',
                    text: 'Export PDF',
                    filename: pageTitle, // Set the downloaded file name to the page title
                    orientation: 'landscape', // 'portrait' or 'landscape'
                    pageSize: 'A4', // A3, A5, etc.
                    title: pageTitle, // Set the PDF title to the page title
                    exportOptions: {
                        columns: ':not(:last-child)', // Exclude the last column
                    },
                    customize: function (doc) {
                        doc.styles.tableHeader = {
                            fillColor: '#4CAF50',
                            color: 'white',
                            alignment: 'center',
                        };
                    },
                },
            ],
            pagingType: "full_numbers",
            scrollCollapse: true,
            paging: true,
            //scrollX: true,           // enable horizontal scroll
            // scrollY: '500px',   
            //fixedHeader: true,     // o
            lengthMenu: [10, 25, 50, 100], // Options for rows per page
        });

        // Initialize the second table with class 'data_table_report'
        new DataTable(".data_table_report", {
            dom: "Bfrtip",
            pageLength: 10, // Limit to 10 rows in the table view
            buttons: [
                {
                    extend: 'csv',
                    text: 'Export CSV',
                    filename: pageTitle, // Set the downloaded file name to the page title
                    exportOptions: {
                        columns: ':visible', // Include all columns (no exclusion)
                    },
                },
                {
                    extend: 'excel',
                    text: 'Export Excel',
                    filename: pageTitle, // Set the downloaded file name to the page title
                    exportOptions: {
                        columns: ':visible', // Include all columns (no exclusion)
                    },
                },
                {
                    extend: 'print',
                    text: 'Print',
                    title: pageTitle, // Set the printed title to the page title
                    exportOptions: {
                        columns: ':visible', // Include all columns (no exclusion)
                    },
                    customize: function (win) {
                        $(win.document.body)
                            .css('font-size', '10pt')
                            .find('table')
                            .addClass('compact')
                            .css('font-size', 'inherit');
                    },
                },
                {
                    extend: 'pdf',
                    text: 'Export PDF',
                    filename: pageTitle, // Set the downloaded file name to the page title
                    orientation: 'landscape', // 'portrait' or 'landscape'
                    pageSize: 'A3', // Set the page size to A3
                    title: pageTitle, // Set the PDF title to the page title
                    exportOptions: {
                        columns: ':visible', // Include all columns (no exclusion)
                    },
                    customize: function (doc) {
                        doc.styles.tableHeader = {
                            fillColor: '#4CAF50',
                            color: 'white',
                            alignment: 'center',
                        };
                    },
                },
            ],
            pagingType: "full_numbers",
            scrollCollapse: true,
            paging: true,
            lengthMenu: [10, 25, 50, 100], // Options for rows per page
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initializeTables();
    });
</script>
