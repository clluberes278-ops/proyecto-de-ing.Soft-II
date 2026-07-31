USE [UniversidadDB]
GO
/****** Objeto: Table [dbo].[Asignatura] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Asignatura](
	[id_asignatura] [int] IDENTITY(1,1) NOT NULL,
	[codigo_asignatura] [varchar](20) NOT NULL,
	[nombre_asignatura] [varchar](100) NOT NULL,
	[creditos] [int] NOT NULL,
	[id_profesor] [int] NULL,
	[id_pensum] [int] NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_asignatura] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED
(
	[codigo_asignatura] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Carrera] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Carrera](
	[id_carrera] [int] IDENTITY(1,1) NOT NULL,
	[codigo_carrera] [varchar](20) NOT NULL,
	[nombre_carrera] [varchar](100) NOT NULL,
	[facultad] [varchar](100) NULL,
	[estado] [varchar](15) NULL,
	[id_facultad] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[id_carrera] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED
(
	[codigo_carrera] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[ConfiguracionUmbral] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ConfiguracionUmbral](
	[id_configuracion] [int] IDENTITY(1,1) NOT NULL,
	[verde] [decimal](5, 2) NOT NULL,
	[amarillo] [decimal](5, 2) NOT NULL,
	[id_periodo] [int] NULL,
	[riesgo] [decimal](5, 2) NOT NULL,
	[rojo] [varchar](15) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[id_configuracion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Estudiante] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Estudiante](
	[id_estudiante] [int] IDENTITY(1,1) NOT NULL,
	[matricula] [varchar](20) NOT NULL,
	[nombre] [varchar](100) NOT NULL,
	[correo] [varchar](100) NULL,
	[id_carrera] [int] NOT NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_estudiante] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED
(
	[matricula] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Facultad] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Facultad](
	[id_facultad] [int] IDENTITY(1,1) NOT NULL,
	[codigo_facultad] [varchar](20) NOT NULL,
	[nombre_facultad] [varchar](100) NOT NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_facultad] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED
(
	[codigo_facultad] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Log] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Log](
	[id_log] [int] IDENTITY(1,1) NOT NULL,
	[tipo] [varchar](20) NOT NULL,
	[evento] [varchar](50) NOT NULL,
	[periodo] [varchar](20) NULL,
	[registros] [int] NULL,
	[archivo] [varchar](100) NULL,
	[fecha] [datetime] NOT NULL,
	[usuario] [varchar](30) NULL,
	[entidad] [varchar](30) NULL,
	[accion] [varchar](20) NULL,
	[descripcion] [varchar](100) NULL,
PRIMARY KEY CLUSTERED
(
	[id_log] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[MantenimientoPensum] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MantenimientoPensum](
	[id_mantenimiento] [int] IDENTITY(1,1) NOT NULL,
	[id_pensum] [int] NOT NULL,
	[id_asignatura] [int] NOT NULL,
	[fecha_cambio] [datetime] NULL,
	[tipo_cambio] [varchar](20) NOT NULL,
	[descripcion] [varchar](500) NULL,
	[usuario] [varchar](50) NULL,
PRIMARY KEY CLUSTERED
(
	[id_mantenimiento] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Nota] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Nota](
	[id_nota] [int] IDENTITY(1,1) NOT NULL,
	[id_estudiante] [int] NOT NULL,
	[id_asignatura] [int] NOT NULL,
	[id_seccion] [int] NOT NULL,
	[acum1] [decimal](5, 2) NULL,
	[acum2] [decimal](5, 2) NULL,
	[acum3] [decimal](5, 2) NULL,
	[eval_final] [decimal](5, 2) NULL,
	[nota_final] [decimal](5, 2) NULL,
	[nota_literal] [varchar](2) NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_nota] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Notificacion] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notificacion](
	[id_notificacion] [int] IDENTITY(1,1) NOT NULL,
	[id_estudiante] [int] NOT NULL,
	[asunto] [varchar](200) NOT NULL,
	[mensaje] [text] NULL,
	[fecha_envio] [datetime] NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_notificacion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Pensum] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Pensum](
	[id_pensum] [int] IDENTITY(1,1) NOT NULL,
	[id_carrera] [int] NOT NULL,
	[creditos_requeridos] [int] NOT NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_pensum] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Periodo] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Periodo](
	[id_periodo] [int] IDENTITY(1,1) NOT NULL,
	[periodo] [varchar](20) NOT NULL,
	[fecha_inicio] [date] NOT NULL,
	[fecha_fin] [date] NOT NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_periodo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Profesor] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Profesor](
	[id_profesor] [int] IDENTITY(1,1) NOT NULL,
	[codigo_profesor] [varchar](20) NOT NULL,
	[nombre] [varchar](100) NOT NULL,
	[correo] [varchar](100) NULL,
	[telefono] [varchar](20) NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_profesor] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED
(
	[codigo_profesor] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Seccion] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Seccion](
	[id_seccion] [int] IDENTITY(1,1) NOT NULL,
	[numero_seccion] [int] NOT NULL,
	[id_asignatura] [int] NOT NULL,
	[id_profesor] [int] NOT NULL,
	[id_periodo] [int] NOT NULL,
	[cuatrimestre] [varchar](10) NULL,
	[estado] [varchar](15) NULL,
PRIMARY KEY CLUSTERED
(
	[id_seccion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[SeccionEstudiante] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SeccionEstudiante](
	[id_seccion_estudiante] [int] IDENTITY(1,1) NOT NULL,
	[id_seccion] [int] NOT NULL,
	[id_estudiante] [int] NOT NULL,
	[fecha_inscripcion] [datetime] NOT NULL,
	[estado] [varchar](15) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[id_seccion_estudiante] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_SeccionEstudiante] UNIQUE NONCLUSTERED
(
	[id_seccion] ASC,
	[id_estudiante] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Usuario] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Usuario](
	[id_usuario] [int] IDENTITY(1,1) NOT NULL,
	[correo] [varchar](100) NOT NULL,
	[password_hash] [varchar](255) NOT NULL,
	[rol] [varchar](20) NOT NULL,
	[id_referencia] [int] NULL,
	[estado] [varchar](15) NOT NULL,
PRIMARY KEY CLUSTERED
(
	[id_usuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED
(
	[correo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Asignatura] ADD  DEFAULT ('Activa') FOR [estado]
GO
ALTER TABLE [dbo].[Carrera] ADD  DEFAULT ('Activa') FOR [estado]
GO
ALTER TABLE [dbo].[Estudiante] ADD  DEFAULT ('Activo') FOR [estado]
GO
ALTER TABLE [dbo].[Facultad] ADD  DEFAULT ('Activa') FOR [estado]
GO
ALTER TABLE [dbo].[Log] ADD  DEFAULT (getdate()) FOR [fecha]
GO
ALTER TABLE [dbo].[MantenimientoPensum] ADD  DEFAULT (getdate()) FOR [fecha_cambio]
GO
ALTER TABLE [dbo].[Nota] ADD  DEFAULT ('Pendiente') FOR [estado]
GO
ALTER TABLE [dbo].[Notificacion] ADD  DEFAULT (getdate()) FOR [fecha_envio]
GO
ALTER TABLE [dbo].[Notificacion] ADD  DEFAULT ('Enviado') FOR [estado]
GO
ALTER TABLE [dbo].[Pensum] ADD  DEFAULT ('Activo') FOR [estado]
GO
ALTER TABLE [dbo].[Periodo] ADD  DEFAULT ('Activo') FOR [estado]
GO
ALTER TABLE [dbo].[Profesor] ADD  DEFAULT ('Activo') FOR [estado]
GO
ALTER TABLE [dbo].[Seccion] ADD  DEFAULT ('Activa') FOR [estado]
GO
ALTER TABLE [dbo].[SeccionEstudiante] ADD  DEFAULT (getdate()) FOR [fecha_inscripcion]
GO
ALTER TABLE [dbo].[SeccionEstudiante] ADD  DEFAULT ('Activa') FOR [estado]
GO
ALTER TABLE [dbo].[Usuario] ADD  DEFAULT ('Activo') FOR [estado]
GO
ALTER TABLE [dbo].[Asignatura]  WITH CHECK ADD  CONSTRAINT [FK_Asignatura_Pensum] FOREIGN KEY([id_pensum])
REFERENCES [dbo].[Pensum] ([id_pensum])
GO
ALTER TABLE [dbo].[Asignatura] CHECK CONSTRAINT [FK_Asignatura_Pensum]
GO
ALTER TABLE [dbo].[Asignatura]  WITH CHECK ADD  CONSTRAINT [FK_Asignatura_Profesor] FOREIGN KEY([id_profesor])
REFERENCES [dbo].[Profesor] ([id_profesor])
GO
ALTER TABLE [dbo].[Asignatura] CHECK CONSTRAINT [FK_Asignatura_Profesor]
GO
ALTER TABLE [dbo].[Carrera]  WITH CHECK ADD  CONSTRAINT [FK_Carrera_Facultad] FOREIGN KEY([id_facultad])
REFERENCES [dbo].[Facultad] ([id_facultad])
GO
ALTER TABLE [dbo].[Carrera] CHECK CONSTRAINT [FK_Carrera_Facultad]
GO
ALTER TABLE [dbo].[ConfiguracionUmbral]  WITH CHECK ADD  CONSTRAINT [FK_ConfigUmbral_Periodo] FOREIGN KEY([id_periodo])
REFERENCES [dbo].[Periodo] ([id_periodo])
GO
ALTER TABLE [dbo].[ConfiguracionUmbral] CHECK CONSTRAINT [FK_ConfigUmbral_Periodo]
GO
ALTER TABLE [dbo].[Estudiante]  WITH CHECK ADD  CONSTRAINT [FK_Estudiante_Carrera] FOREIGN KEY([id_carrera])
REFERENCES [dbo].[Carrera] ([id_carrera])
GO
ALTER TABLE [dbo].[Estudiante] CHECK CONSTRAINT [FK_Estudiante_Carrera]
GO
ALTER TABLE [dbo].[MantenimientoPensum]  WITH CHECK ADD  CONSTRAINT [FK_MantPensum_Asignatura] FOREIGN KEY([id_asignatura])
REFERENCES [dbo].[Asignatura] ([id_asignatura])
GO
ALTER TABLE [dbo].[MantenimientoPensum] CHECK CONSTRAINT [FK_MantPensum_Asignatura]
GO
ALTER TABLE [dbo].[MantenimientoPensum]  WITH CHECK ADD  CONSTRAINT [FK_MantPensum_Pensum] FOREIGN KEY([id_pensum])
REFERENCES [dbo].[Pensum] ([id_pensum])
GO
ALTER TABLE [dbo].[MantenimientoPensum] CHECK CONSTRAINT [FK_MantPensum_Pensum]
GO
ALTER TABLE [dbo].[Nota]  WITH CHECK ADD  CONSTRAINT [FK_Nota_Asignatura] FOREIGN KEY([id_asignatura])
REFERENCES [dbo].[Asignatura] ([id_asignatura])
GO
ALTER TABLE [dbo].[Nota] CHECK CONSTRAINT [FK_Nota_Asignatura]
GO
ALTER TABLE [dbo].[Nota]  WITH CHECK ADD  CONSTRAINT [FK_Nota_Estudiante] FOREIGN KEY([id_estudiante])
REFERENCES [dbo].[Estudiante] ([id_estudiante])
GO
ALTER TABLE [dbo].[Nota] CHECK CONSTRAINT [FK_Nota_Estudiante]
GO
ALTER TABLE [dbo].[Nota]  WITH CHECK ADD  CONSTRAINT [FK_Nota_Seccion] FOREIGN KEY([id_seccion])
REFERENCES [dbo].[Seccion] ([id_seccion])
GO
ALTER TABLE [dbo].[Nota] CHECK CONSTRAINT [FK_Nota_Seccion]
GO
ALTER TABLE [dbo].[Notificacion]  WITH CHECK ADD  CONSTRAINT [FK_Notificacion_Estudiante] FOREIGN KEY([id_estudiante])
REFERENCES [dbo].[Estudiante] ([id_estudiante])
GO
ALTER TABLE [dbo].[Notificacion] CHECK CONSTRAINT [FK_Notificacion_Estudiante]
GO
ALTER TABLE [dbo].[Pensum]  WITH CHECK ADD  CONSTRAINT [FK_Pensum_Carrera] FOREIGN KEY([id_carrera])
REFERENCES [dbo].[Carrera] ([id_carrera])
GO
ALTER TABLE [dbo].[Pensum] CHECK CONSTRAINT [FK_Pensum_Carrera]
GO
ALTER TABLE [dbo].[Seccion]  WITH CHECK ADD  CONSTRAINT [FK_Seccion_Asignatura] FOREIGN KEY([id_asignatura])
REFERENCES [dbo].[Asignatura] ([id_asignatura])
GO
ALTER TABLE [dbo].[Seccion] CHECK CONSTRAINT [FK_Seccion_Asignatura]
GO
ALTER TABLE [dbo].[Seccion]  WITH CHECK ADD  CONSTRAINT [FK_Seccion_Periodo] FOREIGN KEY([id_periodo])
REFERENCES [dbo].[Periodo] ([id_periodo])
GO
ALTER TABLE [dbo].[Seccion] CHECK CONSTRAINT [FK_Seccion_Periodo]
GO
ALTER TABLE [dbo].[Seccion]  WITH CHECK ADD  CONSTRAINT [FK_Seccion_Profesor] FOREIGN KEY([id_profesor])
REFERENCES [dbo].[Profesor] ([id_profesor])
GO
ALTER TABLE [dbo].[Seccion] CHECK CONSTRAINT [FK_Seccion_Profesor]
GO
ALTER TABLE [dbo].[SeccionEstudiante]  WITH CHECK ADD  CONSTRAINT [FK_SeccionEstudiante_Estudiante] FOREIGN KEY([id_estudiante])
REFERENCES [dbo].[Estudiante] ([id_estudiante])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SeccionEstudiante] CHECK CONSTRAINT [FK_SeccionEstudiante_Estudiante]
GO
ALTER TABLE [dbo].[SeccionEstudiante]  WITH CHECK ADD  CONSTRAINT [FK_SeccionEstudiante_Seccion] FOREIGN KEY([id_seccion])
REFERENCES [dbo].[Seccion] ([id_seccion])
ON DELETE CASCADE
GO
